#import "NVActivityIndicatorAnimationCubeTransition.h"
#import "NVActivityIndicatorShape.h"

@implementation NVActivityIndicatorAnimationCubeTransition

- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color {
    [self setUpAnimationInLayer:layer size:size color:color speedMultiplier:1.0];
}

- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color speedMultiplier:(CGFloat)speedMultiplier {
    CGFloat squareSize = size.width / 5;
    CGFloat x = (layer.bounds.size.width - size.width) / 2;
    CGFloat y = (layer.bounds.size.height - size.height) / 2;
    CGFloat deltaX = size.width - squareSize;
    CGFloat deltaY = size.height - squareSize;
    CFTimeInterval duration = 1.6 / speedMultiplier;
    CFTimeInterval beginTime = CACurrentMediaTime();
    NSArray *beginTimes = @[@0, @(-0.8)];
    CAMediaTimingFunction *timingFunction = [CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionEaseInEaseOut];
    
    // Scale animation
    CAKeyframeAnimation *scaleAnimation = [CAKeyframeAnimation animationWithKeyPath:@"transform.scale"];
    scaleAnimation.keyTimes = @[@0, @0.25, @0.5, @0.75, @1];
    scaleAnimation.timingFunctions = @[timingFunction, timingFunction, timingFunction, timingFunction];
    scaleAnimation.values = @[@1, @0.5, @1, @0.5, @1];
    scaleAnimation.duration = duration;
    
    // Translate animation
    CAKeyframeAnimation *translateAnimation = [CAKeyframeAnimation animationWithKeyPath:@"transform.translation"];
    translateAnimation.keyTimes = scaleAnimation.keyTimes;
    translateAnimation.timingFunctions = scaleAnimation.timingFunctions;
    translateAnimation.values = @[
        [NSValue valueWithCGSize:CGSizeMake(0, 0)],
        [NSValue valueWithCGSize:CGSizeMake(deltaX, 0)],
        [NSValue valueWithCGSize:CGSizeMake(deltaX, deltaY)],
        [NSValue valueWithCGSize:CGSizeMake(0, deltaY)],
        [NSValue valueWithCGSize:CGSizeMake(0, 0)]
    ];
    translateAnimation.duration = duration;
    
    // Rotate animation
    CAKeyframeAnimation *rotateAnimation = [CAKeyframeAnimation animationWithKeyPath:@"transform.rotation.z"];
    rotateAnimation.keyTimes = scaleAnimation.keyTimes;
    rotateAnimation.timingFunctions = scaleAnimation.timingFunctions;
    rotateAnimation.values = @[@0, @(-M_PI / 2), @(-M_PI), @(-1.5 * M_PI), @(-2 * M_PI)];
    rotateAnimation.duration = duration;
    
    // Animation group
    CAAnimationGroup *animation = [CAAnimationGroup animation];
    animation.animations = @[scaleAnimation, translateAnimation, rotateAnimation];
    animation.duration = duration;
    animation.repeatCount = HUGE_VALF;
    animation.removedOnCompletion = NO;
    
    // Draw squares
    for (int i = 0; i < 2; i++) {
        CALayer *square = [NVActivityIndicatorShapeHelper layerWithShape:NVActivityIndicatorShapeRectangle 
                                                                     size:CGSizeMake(squareSize, squareSize) 
                                                                    color:color];
        CGRect frame = CGRectMake(x, y, squareSize, squareSize);
        
        animation.beginTime = beginTime + [beginTimes[i] doubleValue];
        square.frame = frame;
        [square addAnimation:animation forKey:@"animation"];
        [layer addSublayer:square];
    }
}

@end
