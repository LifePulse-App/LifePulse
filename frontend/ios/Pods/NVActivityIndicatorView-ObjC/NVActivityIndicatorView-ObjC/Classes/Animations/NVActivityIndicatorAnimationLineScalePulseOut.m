#import "NVActivityIndicatorAnimationLineScalePulseOut.h"
#import "NVActivityIndicatorShape.h"

@implementation NVActivityIndicatorAnimationLineScalePulseOut

- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color {
    [self setUpAnimationInLayer:layer size:size color:color speedMultiplier:1.0];
}

- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color speedMultiplier:(CGFloat)speedMultiplier {
    CGFloat lineSize = size.width / 9;
    CGFloat x = (layer.bounds.size.width - size.width) / 2;
    CGFloat y = (layer.bounds.size.height - size.height) / 2;
    CFTimeInterval duration = 1.0 / speedMultiplier;
    CFTimeInterval beginTime = CACurrentMediaTime();
    NSArray *beginTimes = @[@0.4, @0.2, @0, @0.2, @0.4];
    CAMediaTimingFunction *timingFunction = [CAMediaTimingFunction functionWithControlPoints:0.85 :0.25 :0.37 :0.85];
    
    // Animation
    CAKeyframeAnimation *animation = [CAKeyframeAnimation animationWithKeyPath:@"transform.scale.y"];
    animation.keyTimes = @[@0, @0.5, @1];
    animation.timingFunctions = @[timingFunction, timingFunction];
    animation.values = @[@1, @0.4, @1];
    animation.duration = duration;
    animation.repeatCount = HUGE_VALF;
    animation.removedOnCompletion = NO;
    
    // Draw lines
    for (int i = 0; i < 5; i++) {
        CALayer *line = [NVActivityIndicatorShapeHelper layerWithShape:NVActivityIndicatorShapeLine 
                                                                   size:CGSizeMake(lineSize, size.height) 
                                                                  color:color];
        CGRect frame = CGRectMake(x + lineSize * 2 * i,
                                 y,
                                 lineSize,
                                 size.height);
        
        animation.beginTime = beginTime + [beginTimes[i] doubleValue];
        line.frame = frame;
        [line addAnimation:animation forKey:@"animation"];
        [layer addSublayer:line];
    }
}

@end
