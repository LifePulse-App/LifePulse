#import "NVActivityIndicatorAnimationLineSpinFadeLoader.h"
#import "NVActivityIndicatorShape.h"

@implementation NVActivityIndicatorAnimationLineSpinFadeLoader

- (CALayer *)lineAtAngle:(CGFloat)angle size:(CGSize)size origin:(CGPoint)origin containerSize:(CGSize)containerSize color:(UIColor *)color {
    CGFloat radius = containerSize.width / 2 - MAX(size.width, size.height) / 2;
    CGSize lineContainerSize = CGSizeMake(MAX(size.width, size.height), MAX(size.width, size.height));
    CALayer *lineContainer = [CALayer layer];
    CGRect lineContainerFrame = CGRectMake(origin.x + radius * (cos(angle) + 1),
                                          origin.y + radius * (sin(angle) + 1),
                                          lineContainerSize.width,
                                          lineContainerSize.height);
    CALayer *line = [NVActivityIndicatorShapeHelper layerWithShape:NVActivityIndicatorShapeLine size:size color:color];
    CGRect lineFrame = CGRectMake((lineContainerSize.width - size.width) / 2,
                                 (lineContainerSize.height - size.height) / 2,
                                 size.width,
                                 size.height);
    
    lineContainer.frame = lineContainerFrame;
    line.frame = lineFrame;
    [lineContainer addSublayer:line];
    lineContainer.sublayerTransform = CATransform3DMakeRotation(M_PI / 2 + angle, 0, 0, 1);
    
    return lineContainer;
}

- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color {
    [self setUpAnimationInLayer:layer size:size color:color speedMultiplier:1.0];
}

- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color speedMultiplier:(CGFloat)speedMultiplier {
    CGFloat lineSpacing = 2.0;
    CGSize lineSize = CGSizeMake((size.width - 4 * lineSpacing) / 5, (size.height - 2 * lineSpacing) / 3);
    CGFloat x = (layer.bounds.size.width - size.width) / 2;
    CGFloat y = (layer.bounds.size.height - size.height) / 2;
    CFTimeInterval duration = 1.2 / speedMultiplier;
    CFTimeInterval beginTime = CACurrentMediaTime();
    NSArray *beginTimes = @[@0.12, @0.24, @0.36, @0.48, @0.6, @0.72, @0.84, @0.96];
    CAMediaTimingFunction *timingFunction = [CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionEaseInEaseOut];
    
    // Animation
    CAKeyframeAnimation *animation = [CAKeyframeAnimation animationWithKeyPath:@"opacity"];
    animation.keyTimes = @[@0, @0.5, @1];
    animation.timingFunctions = @[timingFunction, timingFunction];
    animation.values = @[@1, @0.3, @1];
    animation.duration = duration;
    animation.repeatCount = HUGE_VALF;
    animation.removedOnCompletion = NO;
    
    // Draw lines
    for (int i = 0; i < 8; i++) {
        CALayer *line = [self lineAtAngle:(M_PI / 4 * i)
                                     size:lineSize
                                   origin:CGPointMake(x, y)
                            containerSize:size
                                    color:color];
        
        animation.beginTime = beginTime + [beginTimes[i] doubleValue];
        [line addAnimation:animation forKey:@"animation"];
        [layer addSublayer:line];
    }
}

@end
